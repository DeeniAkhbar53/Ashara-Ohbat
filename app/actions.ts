'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const firstName = formData.get('firstName') as string
  const userId = formData.get('userId') as string

  if (firstName && userId) {
    const cookieStore = await cookies()
    cookieStore.set('ashara_session', 'true', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })
    cookieStore.set('user_name', firstName, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    })
    cookieStore.set('user_id', userId, {
      httpOnly: false,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    })
    return { success: true }
  }

  return { error: 'Login Failed' }
}

export async function logout() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('ashara_session')
    cookieStore.delete('user_name')
    cookieStore.delete('user_id')
  } catch (err) {
    console.error("Cookie error in logout:", err)
  }
  redirect('/')
}
