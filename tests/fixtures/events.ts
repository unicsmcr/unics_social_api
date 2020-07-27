import { Event } from '../../src/entities/Event';

const event1 = new Event();
event1.id = '8e45cdcc-bc99-4844-a89b-31a5f2beedcb';
event1.startTime = new Date('Fri Jul 24 2020 20:33:59 GMT+0100 (British Summer Time)');
event1.endTime = new Date('Fri Jul 25 2020 17:00:00 GMT+0100 (British Summer Time)');
event1.title = 'UniCS Test Event!';
event1.description = 'A description of the first UniCS online event';
event1.external = 'https://facebook.com/a/link';

const event2 = new Event();
event2.id = 'e50fa6a6-090b-4013-be44-f27bf2e85cad';
event2.startTime = new Date('Thu Sep 17 2020 17:00:00 GMT+0100 (British Summer Time)');
event2.endTime = new Date('Tue Jul 20 2021 17:00:00 GMT+0100 (British Summer Time)');
event2.title = 'UniCS Year 1';
event2.description = 'A very long event!';
event2.external = 'https://unicsmcr.com/a/link/to/a/page';

export default [
	event1, event2
];
