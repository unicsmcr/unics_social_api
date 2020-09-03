import { User, AccountType, AccountStatus } from '../../src/entities/User';
import Profile from '../../src/entities/Profile';
import { DMChannel } from '../../src/entities/Channel';

/*
	User 1
*/
const user1 = new User();
user1.id = 'f93146ed-1f67-4565-83ae-dd2bc861c4d9';
user1.forename = 'Detective';
user1.surname = 'Pikachu';
user1.email = 'pikachu@student.manchester.ac.uk';
// thunderbolt
user1.password = 'i0D5B9xIo6ViWCpLdIZ5VZPl1Mmf/6NpuCUhaJIYFGM= KW7XSDmhyJKWBJm3oCiR5zfRcUx+x4QfsoJTrNdJBr6tPNsf6ETZAmLz69mvSRjUPpG7P9WjXhOY0UaDJSLJfA==';
user1.accountType = AccountType.User;
user1.accountStatus = AccountStatus.Unverified;


/*
	User 2
*/
const user2 = new User();
user2.id = '822712c1-1329-4fbd-8622-f63075bd4a4d';
user2.forename = 'Test';
user2.surname = 'User';
user2.email = 'testuser@postgrad.manchester.ac.uk';
// kilburn
user2.password = '+/HLf9FWSdu/BLlSbLBN7+na7vvDmpsDqN3LPjIqGUw= hvg9eF3jLvsVPYD8hsEY/MtLHGYlSWeLgqfWkXW2oroLMAR2lLgh6/SJc+8zgNFaQVuSTE/fpIiEQm8RTRLC2g==';
user2.accountType = AccountType.Admin;
user2.accountStatus = AccountStatus.Verified;

const user2Profile = new Profile();
user2Profile.id = 'b1ea3e46-256c-471c-b7b3-aef75a2d5727';
user2Profile.course = 'Computer Science';
user2Profile.yearOfStudy = 2;
user2Profile.instagram = 'testuser';
user2Profile.user = user2;
user2Profile.avatar = false;
user2.profile = user2Profile;


/*
	User 3
*/
const user3 = new User();
user3.id = 'cfa98b69-1da0-4149-98e2-eeebc91c306d';
user3.forename = 'Random';
user3.surname = 'Student';
user3.email = 'randomstudent.2@student.manchester.ac.uk';
// password123
user3.password = '2yXzTgFgsBc925eNbht0Ci1keHO7ZKNtp3jeYqJoS3E= PS64ruaqKFxL7hBAWkUBuWr7MJKP9vqJb3UJxVCPSbI+QiIldokzBZ/4pCxnYPB5HRRKrSspe5xiUTaFGClEbw==';
user3.accountType = AccountType.User;
user3.accountStatus = AccountStatus.Verified;

const user3Profile = new Profile();
user3Profile.id = '0a697716-86a4-4b44-81ad-3ae561bcc7b0';
user3Profile.course = 'International Management';
user3Profile.yearOfStudy = 2;
user3Profile.instagram = 'randomstudent';
user3Profile.twitter = 'random_handle';
user3Profile.avatar = false;
user3Profile.user = user3;
user3.profile = user3Profile;

const dmChannel1 = new DMChannel();
dmChannel1.users = [user3];
dmChannel1.id = 'df8m32ie-1023-8576-ofu0-5502bj49c704';
user3.dmChannels = [dmChannel1];

export default [
	user1, user2, user3
];
