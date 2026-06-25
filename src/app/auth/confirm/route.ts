import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/admin'

  const supabase = createClient()

  // 1. Fluxo PKCE (Padrão atual do Supabase para links gerados pelo template deles)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    } else {
      console.error("Erro na troca de código PKCE:", error)
    }
  }

  // 2. Fluxo Antigo / Template Customizado (token_hash)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    } else {
      console.error("Erro na verificação de OTP/Token:", error)
    }
  }

  // Se chegou aqui, nenhum dos métodos funcionou
  return NextResponse.redirect(new URL('/login?error=Invalid_Token', request.url))
}
