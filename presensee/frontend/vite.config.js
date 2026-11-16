
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),

        VitePWA({
            registerType: 'prompt',

            manifest: {
                name: 'PresenSee',
                short_name: 'PresenSee',
                description: 'Plataforma inteligente de monitoramento da frequência e prevenção da evasão escolar.',
                theme_color: '#101827',
                background_color: '#101827',
                display: 'standalone',
                id: '/login',
                start_url: '/login',
                scope: '/',

                icons: [
                    {
                        src: '/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            }
        })
    ]
})
