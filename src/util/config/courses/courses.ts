import _courses from './courses.json';

interface Course {
	name: string;
	school: string;
}

const courses: Course[] = _courses;

export default courses;
