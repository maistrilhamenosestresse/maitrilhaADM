-- Rode este script no Editor SQL (SQL Editor) do seu painel do Supabase

-- 1. Criar a tabela de Agendas
CREATE TABLE public.agendas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  price numeric NOT NULL,
  description text NOT NULL,
  meeting_point text,
  images text[] DEFAULT '{}'::text[]
);

-- 2. Habilitar segurança a nível de linha (RLS)
ALTER TABLE public.agendas ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas de acesso para a tabela agendas (Leitura e Escrita abertas para facilitar o uso do painel Admin no inicio)
CREATE POLICY "Leitura Publica Agendas" ON public.agendas FOR SELECT USING (true);
CREATE POLICY "Escrita Publica Agendas" ON public.agendas FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizacao Publica Agendas" ON public.agendas FOR UPDATE USING (true);

-- 4. Criar o Bucket de Storage para as fotos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fotos_agendas', 'fotos_agendas', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Criar políticas para o Storage (Permitir visualizar e enviar fotos)
CREATE POLICY "Visualizacao Publica Fotos" ON storage.objects FOR SELECT USING (bucket_id = 'fotos_agendas');
CREATE POLICY "Upload Publico Fotos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'fotos_agendas');
