export const getGithubToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('githubToken') || '';
  }
  return '';
};

export const githubHeaders = {
  Authorization: `Bearer ${getGithubToken()}`,
  Accept: 'application/vnd.github.v3+json',
}; 