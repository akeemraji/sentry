import {Box} from 'grid-emotion';
import PropTypes from 'prop-types';
import React from 'react';
import _ from 'lodash';
import createReactClass from 'create-react-class';
import styled from 'react-emotion';

import {getShortVersion} from 'app/utils';
import {t, tct} from 'app/locale';
import AvatarList from 'app/components/avatar/avatarList';
import Button from 'app/components/button';
import Hovercard from 'app/components/hovercard';
import LastCommit from 'app/components/lastCommit';
import LoadingError from 'app/components/loadingError';
import LoadingIndicator from 'app/components/loadingIndicator';
import RepoLabel from 'app/components/repoLabel';
import TimeSince from 'app/components/timeSince';
import withApi from 'app/utils/withApi';

const VersionHoverCard = createReactClass({
  displayName: 'VersionHoverCard',

  propTypes: {
    api: PropTypes.object,
    version: PropTypes.string.isRequired,
    orgId: PropTypes.string.isRequired,
    projectId: PropTypes.string.isRequired,
  },

  getInitialState() {
    return {
      loading: true,
      error: false,
      data: {},
      visible: false,
      hasRepos: false,
      deploys: [],
    };
  },

  componentDidMount() {
    this.fetchData();
  },

  fetchData() {
    const {orgId, projectId, version} = this.props;
    const done = _.after(3, () => {
      this.setState({loading: false});
    });

    // releases
    const releasePath = `/projects/${orgId}/${projectId}/releases/${encodeURIComponent(
      version
    )}/`;
    this.props.api.request(releasePath, {
      method: 'GET',
      success: data => {
        this.setState({
          release: data,
        });
      },
      error: () => {
        this.setState({
          error: true,
        });
      },
      complete: done,
    });

    // repos
    const repoPath = `/organizations/${orgId}/repos/`;
    this.props.api.request(repoPath, {
      method: 'GET',
      success: data => {
        this.setState({
          hasRepos: data.length > 0,
        });
      },
      error: () => {
        this.setState({
          error: true,
        });
      },
      complete: done,
    });

    //deploys
    const deployPath = `/organizations/${orgId}/releases/${encodeURIComponent(
      version
    )}/deploys/`;
    this.props.api.request(deployPath, {
      method: 'GET',
      success: data => {
        this.setState({
          deploys: data,
        });
      },
      error: () => {
        this.setState({
          error: true,
        });
      },
      complete: done,
    });
  },

  toggleHovercard() {
    this.setState({
      visible: true,
      // visible: !this.state.visible,
    });
  },

  getRepoLink() {
    const {orgId} = this.props;
    return {
      body: (
        <Box p={2} className="align-center">
          <h5>Releases are better with commit data!</h5>
          <p>
            Connect a repository to see commit info, files changed, and authors involved
            in future releases.
          </p>
          <Button href={`/organizations/${orgId}/repos/`} priority="primary">
            Connect a repository
          </Button>
        </Box>
      ),
    };
  },

  getBody() {
    const {release, deploys} = this.state;
    const {version} = this.props;
    const lastCommit = release.lastCommit;
    const shortVersion = getShortVersion(version);

    const recentDeploysByEnviroment = deploys.reduce(function(dbe, deploy) {
      const {dateFinished, environment} = deploy;
      if (!dbe.hasOwnProperty(environment)) {
        dbe[environment] = dateFinished;
      }

      return dbe;
    }, {});
    let mostRecentDeploySlice = Object.keys(recentDeploysByEnviroment);
    if (Object.keys(recentDeploysByEnviroment).length > 3) {
      mostRecentDeploySlice = Object.keys(recentDeploysByEnviroment).slice(0, 3);
    }
    return {
      header: (
        <span className="truncate">
          {tct('Release [version]', {version: shortVersion})}
        </span>
      ),
      body: (
        <div>
          <div className="row row-flex">
            <div className="col-xs-4">
              <h6>{t('New Issues')}</h6>
              <div className="count-since">{release.newGroups}</div>
            </div>
            <div className="col-xs-8">
              <h6 style={{textAlign: 'right'}}>
                {release.commitCount}{' '}
                {release.commitCount !== 1 ? t('commits ') : t('commit ')} {t('by ')}{' '}
                {release.authors.length}{' '}
                {release.authors.length !== 1 ? t('authors') : t('author')}{' '}
              </h6>
              <AvatarList
                users={release.authors}
                avatarSize={25}
                tooltipOptions={{container: 'body'}}
                typeMembers="authors"
              />
            </div>
          </div>
          {lastCommit && <LastCommit commit={lastCommit} headerClass="commit-heading" />}
          {deploys.length > 0 && (
            <div>
              <div className="divider">
                <h6 className="deploy-heading">{t('Deploys')}</h6>
              </div>
              {mostRecentDeploySlice.map((env, idx) => {
                const dateFinished = recentDeploysByEnviroment[env];
                return (
                  <div className="deploy" key={idx}>
                    <div className="deploy-meta" style={{position: 'relative'}}>
                      <VersionRepoLabel>{env}</VersionRepoLabel>
                      {dateFinished && (
                        <span
                          className="text-light"
                          style={{
                            position: 'absolute',
                            left: 98,
                            width: '50%',
                            padding: '3px 0',
                          }}
                        >
                          <TimeSince date={dateFinished} />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ),
    };
  },

  render() {
    const {loading, error, hasRepos} = this.state;
    let header = null;
    let body = loading ? (
      <LoadingIndicator mini={true} />
    ) : error ? (
      <LoadingError />
    ) : null;

    if (!loading && !error) {
      const renderObj = hasRepos ? this.getBody() : this.getRepoLink();
      header = renderObj.header;
      body = renderObj.body;
    }

    return (
      <Hovercard {...this.props} header={header} body={body}>
        {this.props.children}
      </Hovercard>
    );
  },
});

export {VersionHoverCard};

export default withApi(VersionHoverCard);

const VersionRepoLabel = styled(RepoLabel)`
  width: 86px;
`;
