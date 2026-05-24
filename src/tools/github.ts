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
  const { owner, repo } = parseRepoUrl(params.repoUrl)
  const git = simpleGit(params.repoLocalPath)

  const remoteUrl = `https://${process.env.GITHUB_TOKEN}@github.com/${owner}/${repo}.git`
  await git.remote(['set-url', 'origin', remoteUrl])

  await git.checkoutLocalBranch(params.branchName)
  await git.addConfig('user.email', 'bugagent@automated.dev')
  await git.addConfig('user.name', 'BugAgent')
  await git.add('.')
  await git.commit(`[BugAgent] Fix: ${params.title}`)
  await git.push('origin', params.branchName)

  const pr = await octokit.pulls.create({
    owner,
    repo,
    title: params.title,
    body: params.body,
    head: params.branchName,
    base: 'main',
  })

  return pr.data.html_url
}
