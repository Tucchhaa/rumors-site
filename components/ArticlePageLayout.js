import gql from 'graphql-tag';
import { t, ngettext, msgid } from 'ttag';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/react-hooks';
import { makeStyles } from '@material-ui/core/styles';

import useCurrentUser from 'lib/useCurrentUser';
import * as FILTERS from 'constants/articleFilters';
import ListPageCards from 'components/ListPageDisplays/ListPageCards';
import ArticleCard from 'components/ListPageDisplays/ArticleCard';
import ListPageCard from 'components/ListPageDisplays/ListPageCard';
import ReplyItem from 'components/ListPageDisplays/ReplyItem';
import ListPageHeader from 'components/ListPageDisplays/ListPageHeader';
import Infos from 'components/Infos';
import TimeInfo from 'components/Infos/TimeInfo';
import FeedDisplay from 'components/Subscribe/FeedDisplay';
import ExpandableText from 'components/ExpandableText';
import Tools from 'components/ListPageControls/Tools';
import Filters from 'components/ListPageControls/Filters';
import ArticleStatusFilter from 'components/ListPageControls/ArticleStatusFilter';
import CategoryFilter from 'components/ListPageControls/CategoryFilter';
import ReplyTypeFilter from 'components/ListPageControls/ReplyTypeFilter';
import TimeRange from 'components/ListPageControls/TimeRange';
import SortInput from 'components/ListPageControls/SortInput';
import LoadMore from 'components/ListPageControls/LoadMore';

const MAX_KEYWORD_LENGTH = 100;

const LIST_ARTICLES = gql`
  query ListArticles(
    $filter: ListArticleFilter
    $orderBy: [ListArticleOrderBy]
    $after: String
  ) {
    ListArticles(filter: $filter, orderBy: $orderBy, after: $after, first: 25) {
      edges {
        node {
          id
          replyRequestCount
          createdAt
          text
          articleReplies(status: NORMAL) {
            reply {
              id
              ...ReplyItem
            }
            ...ReplyItemArticleReplyData
          }
          ...ArticleCard
        }
        cursor
      }
    }
  }
  ${ArticleCard.fragments.ArticleCard}
  ${ReplyItem.fragments.ReplyItem}
  ${ReplyItem.fragments.ReplyItemArticleReplyData}
`;

const LIST_STAT = gql`
  query ListArticlesStat(
    $filter: ListArticleFilter
    $orderBy: [ListArticleOrderBy]
  ) {
    ListArticles(filter: $filter, orderBy: $orderBy, first: 25) {
      pageInfo {
        firstCursor
        lastCursor
      }
      totalCount
    }
  }
`;

const useStyles = makeStyles(theme => ({
  filters: {
    margin: '12px 0',
  },
  articleList: {
    padding: 0,
  },
  highlight: {
    color: theme.palette.primary[500],
  },
  noStyleLink: {
    // Canceling link styles
    color: 'inherit',
    textDecoration: 'none',
  },
  bustHoaxDivider: {
    fontSize: theme.typography.htmlFontSize,
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    padding: '12px 0',
    '&:before': {
      position: 'absolute',
      top: '50%',
      display: 'block',
      height: '1px',
      width: '100%',
      backgroundColor: theme.palette.secondary[100],
      content: '""',
    },
    '& a': {
      position: 'relative',
      flex: '1 1 shrink',
      borderRadius: 30,
      padding: '10px 26px',
      textAlign: 'center',
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.common.white,
      zIndex: 2,
    },
  },
}));

/**
 * @param {object} urlQuery - URL query object
 * @returns {object} ListArticleFilter
 */
function urlQuery2Filter({
  filters,
  q,
  categoryIds,
  start,
  end,
  types,
  timeRangeKey,
  userId,
} = {}) {
  const filterObj = {};

  if (q) {
    filterObj.moreLikeThis = {
      like: q.slice(0, MAX_KEYWORD_LENGTH),
      minimumShouldMatch: '0',
    };
  }

  if (categoryIds) {
    filterObj.categoryIds = categoryIds.split(',');
  }

  const selectedFilters = typeof filters === 'string' ? filters.split(',') : [];
  selectedFilters.forEach(filter => {
    switch (filter) {
      case FILTERS.REPLIED_BY_ME:
        if (!userId) break;
        filterObj.articleRepliesFrom = {
          userId: userId,
          exists: true,
        };
        break;
      case FILTERS.NO_USEFUL_REPLY_YET:
        filterObj.hasArticleReplyWithMorePositiveFeedback = false;
        break;
      case FILTERS.ASKED_MANY_TIMES:
        filterObj.replyRequestCount = { GTE: 2 };
        break;
      case FILTERS.REPLIED_MANY_TIMES:
        filterObj.replyCount = { GTE: 3 };
        break;
      default:
    }
  });

  if (start) {
    filterObj[timeRangeKey] = { ...filterObj[timeRangeKey], GTE: start };
  }
  if (end) {
    filterObj[timeRangeKey] = { ...filterObj[timeRangeKey], LTE: end };
  }

  if (types) {
    filterObj.replyTypes = types.split(',');
  }

  // Return filterObj only when it is populated.
  if (!Object.keys(filterObj).length) {
    return undefined;
  }

  return filterObj;
}

/**
 * @param {object} urlQuery - URL query object
 * @returns {object[]} ListArticleOrderBy array
 */
function urlQuery2OrderBy({ orderBy } = {}) {
  const key = orderBy || 'lastRequestedAt';
  return [{ [key]: 'DESC' }];
}

/**
 *
 * @param {object} query
 * @returns {object}
 */
export function getQueryVars(query) {
  return {
    filter: urlQuery2Filter(query),
    orderBy: urlQuery2OrderBy(query),
  };
}

function ArticlePageLayout({
  title,
  defaultOrder = 'lastRequestedAt',
  defaultFilters = [],
  timeRangeKey = 'createdAt',
  options = {
    filters: true,
    consider: true,
    category: true,
  },

  // What "page" the <ArticlePageLayout> is used.
  // FIXME: this is a temporary variable bridging the current <ArticlePageLayout> with
  //        future layout with no <ArticlePageLayout> at all.
  //
  page,
}) {
  const classes = useStyles();
  const { query } = useRouter();
  const user = useCurrentUser();

  const listQueryVars = getQueryVars({
    filters: defaultFilters.join(','),
    orderBy: defaultOrder,
    ...query,
    timeRangeKey,
    userId: user?.id,
  });

  const {
    loading,
    fetchMore,
    data: listArticlesData,
    error: listArticlesError,
  } = useQuery(LIST_ARTICLES, {
    variables: listQueryVars,
    notifyOnNetworkStatusChange: true, // Make loading true on `fetchMore`
  });

  // Separate these stats query so that it will be cached by apollo-client and sends no network request
  // on page change, but still works when filter options are updated.
  //
  const { data: listStatData } = useQuery(LIST_STAT, {
    variables: listQueryVars,
  });

  // List data
  const articleEdges = listArticlesData?.ListArticles?.edges || [];
  const statsData = listStatData?.ListArticles || {};

  return (
    <>
      {title && (
        <ListPageHeader title={title}>
          <FeedDisplay listQueryVars={listQueryVars} />
        </ListPageHeader>
      )}

      <Tools>
        <TimeRange />
        <SortInput
          defaultOrderBy={defaultOrder}
          options={[
            { value: 'lastRequestedAt', label: t`Most recently asked` },
            { value: 'lastRepliedAt', label: t`Most recently replied` },
            { value: 'replyRequestCount', label: t`Most asked` },
          ]}
        />
      </Tools>

      <Filters className={classes.filters}>
        {options.filters && <ArticleStatusFilter />}
        {options.consider && <ReplyTypeFilter />}
        {options.category && <CategoryFilter />}
      </Filters>

      {loading && !articleEdges.length ? (
        t`Loading...`
      ) : listArticlesError ? (
        listArticlesError.toString()
      ) : (
        <>
          <ListPageCards>
            {/**
             * FIXME: the "page" logic will be removed when ArticlePageLayout is splitted into
             * each separate page component.
             */}
            {articleEdges.map(({ node: article }) =>
              page === 'replies' ? (
                <ListPageCard key={article.id}>
                  <Infos>
                    <>
                      {ngettext(
                        msgid`${article.replyRequestCount} occurrence`,
                        `${article.replyRequestCount} occurrences`,
                        article.replyRequestCount
                      )}
                    </>
                    <TimeInfo time={article.createdAt}>
                      {timeAgo => t`First reported ${timeAgo} ago`}
                    </TimeInfo>
                  </Infos>
                  <ExpandableText lineClamp={2}>{article.text}</ExpandableText>

                  <div
                    className={classes.bustHoaxDivider}
                    data-ga="Bust hoax button"
                  >
                    <Link href="/article/[id]" as={`/article/${article.id}`}>
                      <a>{t`Bust Hoaxes`}</a>
                    </Link>
                  </div>

                  {article.articleReplies.map(({ reply, ...articleReply }) => (
                    <ReplyItem
                      key={reply.id}
                      articleReply={articleReply}
                      reply={reply}
                    />
                  ))}
                </ListPageCard>
              ) : (
                // This will be copied to pages/articles, pages/search and pages/hoax-for-you
                // when we remove ArticlePageLayout.
                //
                <ArticleCard
                  key={article.id}
                  article={article}
                  query={query.q}
                />
              )
            )}
          </ListPageCards>

          <LoadMore
            edges={articleEdges}
            pageInfo={statsData?.pageInfo}
            loading={loading}
            onMoreRequest={args =>
              fetchMore({
                variables: args,
                updateQuery(prev, { fetchMoreResult }) {
                  if (!fetchMoreResult) return prev;
                  const newArticleData = fetchMoreResult?.ListArticles;
                  return {
                    ...prev,
                    ListArticles: {
                      ...newArticleData,
                      edges: [...articleEdges, ...newArticleData.edges],
                    },
                  };
                },
              })
            }
          />
        </>
      )}
    </>
  );
}

export default ArticlePageLayout;
