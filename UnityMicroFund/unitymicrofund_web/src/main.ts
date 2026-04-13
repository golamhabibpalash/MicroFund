import { platformBrowser } from '@angular/platform-browser';
import { AppModule } from './app/app-module';

console.log('[MAIN] Starting bootstrap...');

window.onerror = function(msg, url, line, col, error) {
  console.error('[GLOBAL ERROR]', msg, 'at line', line);
};

platformBrowser().bootstrapModule(AppModule)
  .then((moduleRef) => {
    console.log('[MAIN] Bootstrap successful!', moduleRef);
  })
  .catch((err) => {
    console.error('[MAIN] Bootstrap failed:', err);
  });
