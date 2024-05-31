import { Khipu } from 'capacitor-khipu';

window.testEcho = () => {
    const inputValue = document.getElementById("echoInput").value;
    Khipu.echo({ value: inputValue })
}
