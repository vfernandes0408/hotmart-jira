export const getGithubToken = () => {
  if (typeof window !== 'undefined') {
    const iaKeys = JSON.parse(localStorage.getItem('iaKeys') || '{}');
    return iaKeys.github || '';
  }
  return '';
};

export const githubHeaders = {
  Authorization: `Bearer ${getGithubToken()}`,
  Accept: 'application/vnd.github.v3+json',
}; 