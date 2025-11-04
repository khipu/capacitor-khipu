import { Khipu } from 'capacitor-khipu';

// eslint-disable-next-line no-undef
window.startOperation = () => {
    Khipu.startOperation({
        operationId: 'z4qi20gyihlu',
        options: {
            title: 'Demo Capacitor',
            locale: 'es_CL',
            theme: 'light',
            skipExitPage: false,
            colors: {
                // lightBackground: '#0000ff',
                // lightPrimary: '#ff00ff',
                // lightTopBarContainer: '#ffffff',
                // lightOnTopBarContainer: '#333333',
            },
            showFooter: true,
            showMerchantLogo: false,
            showPaymentDetails: false,
        },
    }).then((result) => {
        // eslint-disable-next-line no-undef
        document.getElementById('result').value = JSON.stringify(result)
    })
}
