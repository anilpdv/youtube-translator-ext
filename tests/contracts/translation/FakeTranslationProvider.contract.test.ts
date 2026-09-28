import { FakeTranslationProvider } from '../../fakes/FakeTranslationProvider';
import { runTranslationProviderContract } from './TranslationProvider.contract';

runTranslationProviderContract('fake', new FakeTranslationProvider());
