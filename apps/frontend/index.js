import { AppRegistry } from 'react-native';
import App from './App';
import appConfig from './app.json';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const appName = appConfig.expo.name;

function Root() {
  return (
    <SafeAreaProvider>
      <App/ >
    </SafeAreaProvider>
  )
}

// Register the app component with both names for compatibility
AppRegistry.registerComponent(appName, () => Root);
AppRegistry.registerComponent('main', () => Root);

// For web, we need to explicitly run the application
if (typeof document !== 'undefined') {
  AppRegistry.runApplication(appName, {
    rootTag: document.getElementById('root'),
  });
}

