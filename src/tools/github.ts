import { Octokit } from '@octokit/rest'
import simpleGit from 'simple-git'

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/)
  if (!match) throw new Error('Invalid GitHub URL')
  return { owner: match[1], repo: match[2] }
}

export async function createPR(params: {
  repoUrl: string
  repoLocalPath: string
  branchName: string
  title: string
  body: string
  sessionId: string
}): Promise<string> {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not set — cannot push a branch or open a PR.')
  }

  const { owner, repo } = parseRepoUrl(params.repoUrl)
  const git = simpleGit(params.repoLocalPath)

  // The default branch isn't always "main" — ask GitHub instead of guessing.
  let baseBranch = 'main'
  try {
    const repoInfo = await octokit.repos.get({ owner, repo })
    baseBranch = repoInfo.data.default_branch
  } catch (err: unknown) {
    throw new Error(
      `Could not read repo ${owner}/${repo} (${describeGitHubError(err)}). ` +
        `Check the repo URL and that GITHUB_TOKEN can access it.`
    )
  }

  const remoteUrl = `https://${process.env.GITHUB_TOKEN}@github.com/${owner}/${repo}.git`
  await git.remote(['set-url', 'origin', remoteUrl])

  await git.checkoutLocalBranch(params.branchName)
  await git.addConfig('user.email', 'bugagent@automated.dev')
  await git.addConfig('user.name', 'BugAgent')
  await git.add('.')
  await git.commit(`[BugAgent] Fix: ${params.title}`)

  try {
    await git.push('origin', params.branchName)
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message || String(err)
    if (/403|denied|permission|authentication/i.test(msg)) {
      throw new Error(
        `Push to ${owner}/${repo} was rejected. The GITHUB_TOKEN does not have write access ` +
          `to this repo. Use a repo you own (or a fork) and a token with the "repo" scope.`
      )
    }
    throw new Error(`git push failed: ${msg}`)
  }

  try {
    const pr = await octokit.pulls.create({
      owner,
      repo,
      title: params.title,
      body: params.body,
      head: params.branchName,
      base: baseBranch,
    })
    return pr.data.html_url
  } catch (err: unknown) {
    throw new Error(`Opening the PR failed (${describeGitHubError(err)}).`)
  }
}

function describeGitHubError(err: unknown): string {
  const e = err as { status?: number; message?: string }
  return e?.status ? `HTTP ${e.status}: ${e.message}` : e?.message || String(err)
}
