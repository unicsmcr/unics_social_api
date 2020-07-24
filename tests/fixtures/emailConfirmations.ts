import { EmailConfirmation } from '../../src/entities/EmailConfirmation';
import users from './users';

/*
	Confirmation 1
*/
const confirmation1 = new EmailConfirmation();
confirmation1.id = '2b18f70b-c7c4-4361-b1c6-d8219dc26adc';
confirmation1.user = users[0];

export default [
	confirmation1
];
