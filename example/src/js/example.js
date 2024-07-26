import { Khipu } from 'capacitor-khipu';

// eslint-disable-next-line no-undef
window.startOperation = () => {
    Khipu.startOperation({
        operationId: '3zxucrysvejz',
        options: {
            title: 'Demo Capacitor',
            locale: 'es_CL',
            theme: 'light',
            skipExitPage: true,
            colors: {
                // lightBackground: '#0000ff',
                lightPrimary: '#ff00ff',
                // lightTopBarContainer: '#ffffff',
                // lightOnTopBarContainer: '#333333',
            },
            showFooter: false,
        },
    }).then((result) => {
        // eslint-disable-next-line no-undef
        document.getElementById('result').value = JSON.stringify(result)
    })
}
