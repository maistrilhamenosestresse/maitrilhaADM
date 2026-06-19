-- 1. Adicionar coluna de vídeo na tabela
ALTER TABLE public.agendas ADD COLUMN IF NOT EXISTS video_url text;

-- 2. Corrigir permissão de deletar para a administradora
DROP POLICY IF EXISTS "Delecao Publica Agendas" ON public.agendas;
CREATE POLICY "Delecao Publica Agendas" ON public.agendas FOR DELETE TO public USING (true);
