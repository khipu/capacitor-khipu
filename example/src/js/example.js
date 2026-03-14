import { Khipu } from 'capacitor-khipu';

// eslint-disable-next-line no-undef
window.startOperation = () => {
    Khipu.startOperation({
      operationId: '9sy0aufujsgq',
      options: {
        title: 'Demo Capacitor',
        locale: 'es_CL',
        theme: 'light',
        skipExitPage: false,
        skipExitSuccessPage: true,
        colors: {
          // lightBackground: '#0000ff',
          // lightPrimary: '#ff00ff',
          // lightTopBarContainer: '#ffffff',
          // lightOnTopBarContainer: '#333333',
        },
        showFooter: true,
        showMerchantLogo: false,
        showPaymentDetails: true,
      },
    }).then(result => {
      // eslint-disable-next-line no-undef
      document.getElementById('result').value = JSON.stringify(result);
    });
}
