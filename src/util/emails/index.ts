export const VerifyEmailTemplate = (name: string, token: string) =>
	`<b>Hi ${name}!</b>

<p>We need you to activate your UniCS KB account.</p>

<p>
<a href="https://URLPLACEHOLDER.com/verify?token=${token}">Click here to confirm your email address</a>.
If that link does not work, please follow https://URLPLACEHOLDER.com/verify?token=${token}.
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
