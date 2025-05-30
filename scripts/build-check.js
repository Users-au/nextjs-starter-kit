#!/usr/bin/env node

/**
 * Build Check Script
 * 
 * This script validates that all required environment variables
 * are set before building for production.
 */

const requiredEnvVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'USERSAU_CLIENT_ID',
  'USERSAU_CLIENT_SECRET',
  'USERSAU_HOST'
]

const optionalEnvVars = [
  'NEXT_PUBLIC_APP_NAME',
  'NEXT_PUBLIC_USERSAU_HOST'
]

console.log('🔍 Checking environment variables...')

let hasErrors = false

// Check required variables
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`)
    hasErrors = true
  } else {
    console.log(`✅ ${varName} is set`)
  }
})

// Check optional variables
optionalEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.warn(`⚠️  Optional environment variable not set: ${varName}`)
  } else {
    console.log(`✅ ${varName} is set`)
  }
})

// Additional validations
if (process.env.NEXTAUTH_URL) {
  if (process.env.NEXTAUTH_URL === 'http://localhost:3000' && process.env.NODE_ENV === 'production') {
    console.error('❌ NEXTAUTH_URL is set to localhost in production environment')
    hasErrors = true
  }
  
  if (!process.env.NEXTAUTH_URL.startsWith('http')) {
    console.error('❌ NEXTAUTH_URL must start with http:// or https://')
    hasErrors = true
  }
}

if (process.env.USERSAU_HOST && !process.env.USERSAU_HOST.startsWith('https://')) {
  console.error('❌ USERSAU_HOST must start with https://')
  hasErrors = true
}

if (hasErrors) {
  console.error('\n💥 Environment validation failed. Please fix the errors above.')
  process.exit(1)
} else {
  console.log('\n✨ All environment variables are properly configured!')
  console.log('🚀 Ready for deployment!')
} 