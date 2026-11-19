import { AppRegistry } from 'react-native';
import App from '../App';

AppRegistry.registerComponent('SafwanShop', () => App);
AppRegistry.runApplication('SafwanShop', {
  rootTag: document.getElementById('root') as any,
  initialProps: {},
});
