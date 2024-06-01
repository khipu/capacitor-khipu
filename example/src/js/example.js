import { Khipu } from 'capacitor-khipu';

window.startOperation = () => {
    Khipu.startOperation({
        operationId: 'hxet5stmvvoj',
        options: {
            title: 'Demo Capacitor',
            locale: 'es_CL',
            theme: 'light',
            skipExitPage: true,
            colors: {
                // lightBackground: '#0000ff',
                // lightPrimary: '#ff00ff',
                // lightTopBarContainer: '#ffffff',
                // lightOnTopBarContainer: '#333333',
            },
        },
    }).then((result) => {
        document.getElementById('result').value = JSON.stringify(result)
    })
}
