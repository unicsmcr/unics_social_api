import { Event } from '../../src/entities/Event';

const event1 = new Event();
event1.id = '8e45cdcc-bc99-4844-a89b-31a5f2beedcb';
event1.startTime = new Date('Date Fri Jul 24 2020 20:33:59 GMT+0100 (British Summer Time)');
event1.endTime = new Date('Date Fri Jul 25 2020 17:00:00 GMT+0100 (British Summer Time)');
event1.title = 'UniCS Test Event!';
event1.description = 'A description of the first UniCS online event';
event1.external = 'https://facebook.com/a/link';

export default [
	event1
];
