export default function PostsLoading() {
  return (
    <div className="post-card-list" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="post-card post-card-skeleton" key={index}>
          <div className="skeleton-block skeleton-media" />
          <div className="skeleton-block skeleton-line" />
        </div>
      ))}
    </div>
  );
}
