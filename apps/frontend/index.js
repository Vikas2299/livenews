import { AppRegistry } from 'react-native';
import App from './App';
import appConfig from './app.json';

const appName = appConfig.expo.name;

// Register the app component with both names for compatibility
AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('main', () => App);

// For web, we need to explicitly run the application
if (typeof document !== 'undefined') {
  AppRegistry.runApplication(appName, {
    rootTag: document.getElementById('root'),
  });
}
