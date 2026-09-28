import { FakeTranslationCacheRepository } from '../../fakes/FakeTranslationCacheRepository';
import { runCacheRepositoryContract } from './TranslationCacheRepository.contract';

runCacheRepositoryContract('fake', new FakeTranslationCacheRepository());
