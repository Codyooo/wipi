import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Icon, Avatar, Pagination } from 'antd';
import { format } from 'timeago.js';
import cls from 'classnames';
import hljs from 'highlight.js';
import { CommentProvider } from '@providers/comment';
import { Editor } from './Editor';
import style from './index.module.scss';

const colors = [
  '#52c41a',
  '#f5222d',
  '#1890ff',
  '#faad14',
  '#ff0064',
  '#722ed1',
];
const getRandomColor = (() => {
  let cache = {};

  return (key): string => {
    if (!cache[key]) {
      let color = colors[Math.floor(Math.random() * colors.length)];
      cache[key] = color;
      return color;
    } else {
      return cache[key];
    }
  };
})();

export const CommentItem = ({
  comment,
  parentComment,
  hostId,
  isHostInPage,
  onReply = () => {},
  subComments = [],
  isChildren = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [replyComment, setReplyComment] = useState(null);

  return (
    <div className={style.commentItem}>
      <header>
        <Avatar
          size={isChildren ? 24 : 32}
          style={{ backgroundColor: getRandomColor(comment.name) }}
        >
          {('' + comment.name).charAt(0).toUpperCase()}
        </Avatar>
        <span className={style.info}>
          <strong>{comment.name}</strong>
          {comment.replyUserName ? (
            <>
              <span>回复</span>
              <strong className={style.replyUser}>
                {comment.replyUserName}
              </strong>
            </>
          ) : null}
        </span>
      </header>
      <main style={{ paddingLeft: isChildren ? 24 + 10 : 32 + 10 }}>
        <div
          className={cls('markdown', style.content)}
          dangerouslySetInnerHTML={{ __html: comment.content }}
        ></div>
        <div className={style.meta}>
          {comment.userAgent ? <span>{comment.userAgent}</span> : null}
          <span>{format(comment.createAt, 'zh_CN')}</span>
          <span
            className={style.reply}
            onClick={() => {
              if (isChildren) {
                onReply();
              } else {
                setReplyComment(comment);
              }

              setVisible(true);
            }}
          >
            <Icon type="message" />
            回复
          </span>
        </div>
        {subComments && subComments.length ? (
          <div className={style.subComments}>
            {subComments.map((subComment) => (
              <CommentItem
                key={subComment.id}
                comment={subComment}
                parentComment={comment}
                hostId={hostId}
                isHostInPage={isHostInPage}
                onReply={() => {
                  setReplyComment(subComment);
                  setVisible(true);
                }}
                isChildren={true}
              />
            ))}
          </div>
        ) : null}
      </main>
      {isChildren ? null : (
        <div
          className={cls(
            style.editorContainer,
            visible ? style.isActive : false
          )}
          style={{ paddingLeft: isChildren ? 24 + 10 : 32 + 10 }}
        >
          <Editor
            hostId={hostId}
            isHostInPage={isHostInPage}
            parentComment={comment}
            replyComment={replyComment}
            onSuccess={() => setReplyComment(null)}
            renderFooter={({ loading, disabled, submit }) => {
              return [
                <Button
                  style={{ marginRight: 16 }}
                  onClick={() => setVisible(false)}
                >
                  收起
                </Button>,
                <Button
                  loading={loading}
                  onClick={submit}
                  type="primary"
                  disabled={disabled}
                >
                  评论
                </Button>,
              ];
            }}
          />
        </div>
      )}
    </div>
  );
};

interface IProps {
  articleId: string;
  isInPage?: boolean;
}

export const MyComment: React.FC<IProps> = ({
  articleId,
  isInPage = false,
}) => {
  const ref = useRef(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [comments, setComments] = useState<IComment[]>([]);
  const [loading, setLoading] = useState(false);

  const getComments = useCallback(
    (page, pageSize, loadMore = false) => {
      setLoading(true);
      CommentProvider.getArticleComments(articleId, {
        page,
        pageSize,
      })
        .then((res) => {
          setComments(res[0]);
          setTotal(res[1]);
          setTimeout(() => {
            setLoading(false);
            const blocks = ref.current.querySelectorAll('pre code');
            blocks.forEach((block) => hljs.highlightBlock(block));
          }, 0);
        })
        .catch((err) => {
          setLoading(false);
        });
    },
    [articleId]
  );

  const loadMore = (page) => {
    setPage(page);
    getComments(page, pageSize, true);
  };

  useEffect(() => {
    hljs.initHighlightingOnLoad();
  }, []);

  useEffect(() => {
    setPage(1);
    getComments(1, pageSize, false);
  }, [articleId]);

  return (
    <div className={style.commentWrapper} ref={ref}>
      <Editor
        hostId={articleId}
        isHostInPage={isInPage}
        parentComment={null}
        replyComment={null}
      />
      <div className={style.commentContainer}>
        {comments.map((comment, i) => {
          return (
            <CommentItem
              key={comment.id}
              comment={comment}
              parentComment={[]}
              subComments={comment.children}
              hostId={articleId}
              isHostInPage={isInPage}
            />
          );
        })}
      </div>

      <div className={style.pagination}>
        {!loading && total > 0 ? (
          <Pagination
            size="small"
            current={page}
            pageSize={pageSize}
            total={total}
            onChange={loadMore}
          />
        ) : loading ? (
          <Button type="primary" loading={true}>
            加载中
          </Button>
        ) : null}
      </div>
    </div>
  );
};
