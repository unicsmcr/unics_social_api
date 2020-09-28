import { getConfig } from '../config';
import { APIReport } from '../../entities/Report';

export const VerifyEmailTemplate = (name: string, token: string) => {
	const url = `${getConfig().host}/verify?token=${token}`;
	return `<b>Hi ${name}!</b>

<p>We need you to activate your UniCS KB account.</p>

<p>
<a href="${url}">Click here to confirm your email address</a>.
</p>

<p>
If that link does not work, please follow ${url}.
</p>

<p>
Didn't make this request? No worries, you don't need to do anything.
</p>

<p>
Thanks,<br />
The UniCS Robot 🤖
</p>

<br />
<br />

<img src="https://unicsmcr.com/assets/logo.png" />
`;
};

export const PasswordEmailTemplate = (name: string, token: string) => {
	const url = `${getConfig().host}/reset_password?token=${token}`;
	return `<b>Hi ${name}!</b>

<p>You can now update your KB password.</p>

<p>
<a href="${url}">Click here to change your current password</a>.
</p>

<p>
If that link does not work, please follow ${url}.
</p>

<p>
Didn't make this request? No worries, you don't need to do anything.
</p>

<p>
Thanks,<br />
The UniCS Robot 🤖
</p>

<br />
<br />

<img src="https://unicsmcr.com/assets/logo.png" />
`;
};
export const ReportEmailTemplate = (report: APIReport) =>
	`<p>Dear UNICS team,</p>

	<p>
	The user with id: ${report.reportedUserID} has been reported by ${report.reportingUserID}.
	</p>
	
	<p>
	The reason for the report is as follows:<br />
	${report.description}
	</p>
	
	<p>
	Thanks,<br />
	The UniCS Robot 🤖
	</p>	

	<br />
	<br />

	<img src="https://unicsmcr.com/assets/logo.png" />
`;
