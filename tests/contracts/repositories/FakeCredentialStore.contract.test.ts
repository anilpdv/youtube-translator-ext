import { FakeCredentialStore } from '../../fakes/FakeCredentialStore';
import { runCredentialStoreContract } from './CredentialStore.contract';

runCredentialStoreContract('fake', new FakeCredentialStore());
