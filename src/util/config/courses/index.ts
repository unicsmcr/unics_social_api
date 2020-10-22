import _courses from './courses.json';

interface Course {
	name: string;
	school: string;
}

const courses: Course[] = _courses;

export function getDepartmentFromCourse(course: string): string {
	return courses.find(entry => entry.name === course)?.school ?? 'Other';
}

export { courses };
