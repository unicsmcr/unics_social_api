const AMP_REGEX = new RegExp(/&/g);
const LT_REGEX = new RegExp(/</g);
const GT_REGEX = new RegExp(/>/g);
const QUOTE_REGEX = new RegExp(/"/g);
const APOSTROPHE_REGEX = new RegExp(/'/g);

export function sanitiseHTML(input: string) {
	return input.replace(AMP_REGEX, '&amp;')
		.replace(LT_REGEX, '&lt;')
		.replace(GT_REGEX, '&gt;')
		.replace(QUOTE_REGEX, '&quot;')
		.replace(APOSTROPHE_REGEX, '&#039;');
}
