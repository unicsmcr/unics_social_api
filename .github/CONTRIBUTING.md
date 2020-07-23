# Contributing

Great! You want to contribute to this project. Make sure you've [checked the setup guide](https://github.com/unicsmcr/unics_social_api/wiki/quick-start) to get the basics sorted first.

## Commit Guidelines

- We are following the [Conventional Commit](https://www.conventionalcommits.org/en/v1.0.0/) guidelines.
- Try your best to follow this in your own branches, but don't worry if you forget for some commits.
- You can also use the following types (adapted from Angular's commit guidelines):

	- **build**: Changes that affect the build system or external dependencies (example scopes: npm, tsc, eslint)
	- **ci**: Changes to our CI configuration files and scripts
	- **docs**: Documentation only changes
	- **feat**: A new feature
	- **fix**: A bug fix
	- **perf**: A code change that improves performance
	- **refactor**: A code change that neither fixes a bug nor adds a feature
	- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
	- **test**: Adding missing tests or correcting existing tests
	- **chore**: Any other change

## Pull Request Guidelines

- Make sure you `git pull` on the appropriate branches to make sure you're up-to-date!
- We are following a modified version of the [Gitflow Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow) with the following exceptions:
	- Our "master" branch is called `stable`
	- Our "develop" branch is called `main` ([why it's not called master](https://dev.to/damcosset/replacing-master-in-git-2jim))
	- Overall, it is a less strict version of the Gitflow Workflow.

- As we are using a less strict version of Gitflow, we only really care about the following 2 branch types:
	- Create a `feat/...` branch from the `main` branch (or another feature branch if it is required) to do anything that _isn't_ a hotfix. This includes new features, non-critical bug fixes, documentation changes, etc.
		> Example: if you wanted to add a new feature that adds teleportation to the library:
		> ```bash
		> $ git checkout main # make sure we are working on the development branch
		> $ git pull # make sure we have the latest commits
		> $ git checkout -b feat/teleportation # create our new feature branch
		> # write some code, push some commits... done!
		> ```
		> Create a pull request from your branch into `main`, using the commit conventions above to title your pull request. In this example, we are adding new functionality to the project, so we could call the pull request `"feat: add teleportation"`. A change to documentation could be called `docs: update abc...`

	- Create a `hotfix/...` branch for something that needs to be fixed quickly in production releases (i.e. for code in the `stable` branch). This will be merged into both the `stable` _and_ `main` branch.
		> Example: you wanted wanted to fix a bug that allowed users to sign in with any pasword.
		> ```bash
		> $ git checkout stable # make sure we are working on the stable branch
		> $ git pull # make sure we have the latest commits
		> $ git checkout -b hotfix/user-login # create our new hotfix branch
		> # write some code, push some commits... done!
		> ```
		> Create a pull request from your branch into `stable` using the `fix: ` prefix. In this example, the pull request would be called `fix: user login password verification`.
