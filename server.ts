import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON payload parser limit
  app.use(express.json({ limit: '20mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // API Endpoint to scan/analyze attached receipt or invoice
  app.post('/api/analyze-receipt', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY não foi configurada no ambiente.',
        });
      }

      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Nenhum arquivo ou imagem fornecida.' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const cleanMimeType = mimeType || 'image/png';
      // Clean base64 prefix if passed
      const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');

      const prompt = `Você é um assistente contábil perito em analisar recibos, notas fiscais, faturas e comprovantes de pagamento para a entidade social "Guarda Mirim de Mauá" (CIIJM).

Examine o comprovante anexado e extraia as seguintes informações estruturadas em JSON:
1. "amount": Valor total numérico do recibo/comprovante (ex: 150.50). Se não encontrar, retorne 0.
2. "date": Data da movimentação no formato YYYY-MM-DD. Se não identificar o ano, use o ano corrente 2026.
3. "description": Nome do fornecedor, estabelecimento, empresa ou pagador indicado no recibo (ex: "POSTO SHELL", "MERCADO SOBERANA", "ENEL DISTRIBUIÇÃO", "ITAÚ UNIBANCO"). Mantenha sucinto.
4. "notes": Detalhamento do que foi comprado/serviço prestado ou itens constantes no recibo (ex: "Compra de 10 resmas de papel A4 e 5 canetas" ou "Taxa de manutenção mensal").
5. "category": Categoria contábil mais apropriada dentre estas opções exatas:
   - "Operacionais (Luz, Água, Internet, Tel)"
   - "Manutenção & Reformas"
   - "Material de Escritório & Pedagógico"
   - "Alimentação & Eventos"
   - "Serviços Terceirizados & Contabilidade"
   - "Impostos & Tarifas Bancárias"
   - "Outras Despesas"
   - "Doações & Parcerias"
   - "Subvenções / Convênios Públicos"
   - "Eventos Beneficentes"
   - "Outras Receitas"
6. "type": "expense" se for despesa/comprovante de pagamento/saída, ou "income" se for recibo de doação/receita/entrada. Default é "expense".`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: {
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
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER, description: 'Valor total do recibo' },
              date: { type: Type.STRING, description: 'Data YYYY-MM-DD' },
              description: { type: Type.STRING, description: 'Nome do fornecedor ou estabelecimento no recibo' },
              notes: { type: Type.STRING, description: 'Detalhamento do que foi comprado ou pago' },
              category: { type: Type.STRING, description: 'Categoria exata recomendada' },
              type: { type: Type.STRING, description: 'expense ou income' },
            },
            required: ['amount', 'description', 'notes', 'category', 'type'],
          },
        },
      });

      const jsonText = response.text?.trim() || '{}';
      const parsedData = JSON.parse(jsonText);

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (err: unknown) {
      console.error('Erro na análise de recibo por IA:', err);
      const errorMessage = err instanceof Error ? err.message : 'Falha ao analisar o recibo com inteligência artificial.';
      return res.status(500).json({
        error: errorMessage,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
