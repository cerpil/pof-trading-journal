# POF Trading Journal

Plataforma profissional de análise de trading com identidade visual premium e integração com Supabase.

## 🚀 Funcionalidades Premium Implementadas

- **Dashboard Executivo:** Métricas de P&L, Win Rate, Profit Factor e Expectancy.
- **POF Score:** Algoritmo exclusivo que pontua sua performance (0-100) baseado em lucro, consistência e disciplina.
- **Gestão de Playbooks:** Catalogue seus setups e veja qual estratégia é mais lucrativa.
- **Análise Temporal:** Saiba quais dias da semana e horários você performa melhor.
- **Calendário de Performance:** Visualização mensal intuitiva dos seus resultados.
- **Notificações Modernas:** Integração com SweetAlert2 para uma experiência fluida.
- **Exportação CSV:** Exporte todos os seus dados para análises externas no Excel ou Python.

## 🛠️ Configuração Necessária

### 1. Banco de Dados (Supabase)
1. Crie uma conta em [supabase.com](https://supabase.com).
2. Crie um novo projeto.
3. Vá em **SQL Editor** e execute o script abaixo para criar as tabelas:

```sql
CREATE TABLE trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    asset TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    entry_price DECIMAL(10,2) NOT NULL,
    exit_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    stop_loss DECIMAL(10,2),
    take_profit DECIMAL(10,2),
    setup TEXT,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    pnl DECIMAL(10,2) NOT NULL,
    pnl_percent DECIMAL(5,2) NOT NULL,
    r_multiple DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE playbooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS (Row Level Security)
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own trades"
    ON trades FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own playbooks"
    ON playbooks FOR ALL USING (auth.uid() = user_id);
```

### 2. Integração
1. No Supabase, vá em **Project Settings** -> **API**.
2. Copie a `Project URL` e a `anon key`.
3. Abra o arquivo `js/app.js` e substitua as constantes no topo do arquivo:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

## 📦 Deploy no GitHub & Netlify

1. Inicialize o repositório local:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: POF Trading Journal"
   ```
2. Crie um repositório no GitHub e faça o push.
3. Conecte o repositório ao Netlify para deploy automático.

---
*Desenvolvido para traders que buscam a excelência operacional.*
