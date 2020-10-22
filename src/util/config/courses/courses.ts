import _courses from './courses.json';

interface Course {
	name: string;
	school: string;
	ugt: boolean;
}

const courses: Course[] = _courses;

export default courses;
