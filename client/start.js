
const Mesh = require('happner-2');
const delay = require('await-delay');

const client = new Mesh.MeshClient({ secure: true });
const credentials = {
    username: '_ADMIN', // pending
    password: 'happn'
  };

client
.login(credentials)
.then(startActivity)

async function startActivity() {
    client.data.onEvent('reconnect-scheduled', function() {
        console.log('reconnect scheduled...');
    });
    client.data.onEvent('reconnect-successful', function() {
        console.log('reconnect successful...');
    });
    while(true) {
        console.log('do something');
        await delay(2000);
    }
}