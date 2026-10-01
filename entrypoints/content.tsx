import { createContentApplication } from '../content/createContentApplication';
import { ContentRuntimeMessageHandler } from '../content/messaging/ContentRuntimeMessageHandler';

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  cssInjectionMode: 'ui',

  async main() {
    const application = await createContentApplication();
    const messages = new ContentRuntimeMessageHandler(application);
    application.start();

    const listener = (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ): boolean => {
      void messages.handle(message).then(sendResponse);
      return true;
    };

    chrome.runtime.onMessage.addListener(listener);

    return async () => {
      chrome.runtime.onMessage.removeListener(listener);
      await application.dispose();
    };
  },
});
