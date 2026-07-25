import { GoogleGenAI, Type } from '@google/genai';

interface ApiRequest {
  method?: string;
  body?: unknown;
}

interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(data: unknown): void;
  end(): void;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não foi configurada no ambiente.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { imageBase64, mimeType } = (body || {}) as { imageBase64?: string; mimeType?: string };

    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhum arquivo ou imagem fornecida.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    let cleanMimeType = mimeType || 'image/png';
    const dataUriMatch = imageBase64.match(/^data:([^;]+);base64,/);
    if (dataUriMatch && dataUriMatch[1]) {
      cleanMimeType = dataUriMatch[1];
    }

    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();

    const prompt = `Você é um assistente contábil perito em analisar recibos, notas fiscais, faturas e comprovantes de pagamento para a entidade social "Guarda Mirim de Mauá" (CIIJM).

Analise o comprovante fornecido e extraia com precisão absoluta:
1. "amount": Valor total (número float, ex: 152.00).
2. "date": Data do pagamento/emissão em formato YYYY-MM-DD.
3. "description": Nome da empresa/pessoa/fornecedor emissor do comprovante.
4. "notes": Descrição/detalhes dos produtos, serviços ou itens listados no comprovante.
5. "category": Selecione a categoria mais adequada dentre as seguintes opções EXATAS:
   - "Operacionais (Luz, Água, Internet, Tel)"
   - "Manutenção de Infraestrutura e Reformas"
   - "Alimentação e Eventos Infantis"
   - "Materiais Pedagógicos e Didáticos"
   - "Combustível, Transporte e Logística"
   - "Encargos, Tarifas Bancárias e Impostos"
   - "Subvenções e Convênios Municipais"
   - "Doações e Colaborações Voluntárias"
   - "Serviços Prestados e Mensalidades"
   - "Eventos Beneficentes e Bazares"
   - "Outras Despesas"
   - "Outras Receitas"
6. "type": "expense" se for despesa/comprovante de pagamento/saída, ou "income" se for recibo de doação/receita/entrada. Default é "expense".`;

    const contentsPayload = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: cleanMimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ];

    let rawText = '';
    const modelsToTry = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-2.5-pro', 'gemini-flash-latest'];
    let lastError: unknown = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contentsPayload,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                amount: { type: Type.NUMBER, description: 'Valor total do recibo' },
                date: { type: Type.STRING, description: 'Data YYYY-MM-DD' },
                description: { type: Type.STRING, description: 'Nome do fornecedor ou estabelecimento' },
                notes: { type: Type.STRING, description: 'Detalhamento do que foi comprado ou pago' },
                category: { type: Type.STRING, description: 'Categoria exata recomendada' },
                type: { type: Type.STRING, description: 'expense ou income' },
              },
              required: ['amount', 'description', 'notes', 'category', 'type'],
            },
          },
        });
        if (response?.text) {
          rawText = response.text;
          break;
        }
      } catch (mErr) {
        lastError = mErr;
      }
    }

    if (!rawText) {
      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: contentsPayload,
          });
          if (response?.text) {
            rawText = response.text;
            break;
          }
        } catch (mErr) {
          lastError = mErr;
        }
      }
    }

    if (!rawText) {
      console.warn('All Gemini models failed in analyze-receipt API:', lastError);
      return res.status(500).json({ error: 'Nenhum modelo de IA conseguiu processar este comprovante.' });
    }

    let jsonText = rawText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    const parsedData = JSON.parse(jsonText);

    return res.status(200).json({
      success: true,
      data: parsedData,
    });
  } catch (error: unknown) {
    console.error('API analyze-receipt error:', error);
    const message = error instanceof Error ? error.message : 'Erro ao processar recibo por IA.';
    return res.status(500).json({
      error: message,
    });
  }
}
