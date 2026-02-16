import math
from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from server.database import get_db
from server.auth import get_current_user
from server.models.thought import Community, ThoughtPost, Comment, Vote

router = APIRouter(prefix="")

EPOCH = datetime(1970, 1, 1)


def _hot_score(vote_score, created_at):
    score = vote_score
    order = math.log10(max(abs(score), 1))
    sign = 1 if score > 0 else -1 if score < 0 else 0
    seconds = (created_at - EPOCH).total_seconds()
    return sign * order + seconds / 45000


# -- Communities --

@router.get("/thoughts/communities")
async def get_communities(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Community)
        .where(Community.user_id == user.id)
        .order_by(Community.name)
    )
    return [c.to_dict() for c in result.scalars().all()]


@router.post("/thoughts/communities")
async def create_community(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Community name is required")

    result = await db.execute(
        select(Community).where(
            Community.user_id == user.id, Community.name == name
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Community already exists")

    community = Community(user_id=user.id, name=name)
    db.add(community)
    await db.flush()
    await db.refresh(community)
    return JSONResponse(content=community.to_dict(), status_code=201)


@router.delete("/thoughts/communities/{id}")
async def delete_community(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Community).where(
            Community.id == id, Community.user_id == user.id
        )
    )
    community = result.scalar_one_or_none()
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    await db.delete(community)
    await db.flush()
    return {"message": "Community deleted"}


# -- Posts --

@router.get("/thoughts/posts")
async def get_posts(
    community: Optional[str] = None,
    sort: Optional[str] = "new",
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    query = select(ThoughtPost).where(ThoughtPost.user_id == user.id)
    if community:
        query = query.where(ThoughtPost.community_id == int(community))

    result = await db.execute(query)
    posts = list(result.scalars().all())

    if sort == "top":
        posts.sort(key=lambda p: (p.vote_score, p.created_at), reverse=True)
    elif sort == "hot":
        posts.sort(key=lambda p: _hot_score(p.vote_score, p.created_at), reverse=True)
    else:
        posts.sort(key=lambda p: p.created_at, reverse=True)

    return [p.to_dict() for p in posts]


@router.post("/thoughts/posts")
async def create_post(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    raw_tags = body.get("tags", "")
    normalized_tags = ",".join(t.strip().lower() for t in raw_tags.split(",") if t.strip())
    post = ThoughtPost(
        user_id=user.id,
        title=body["title"],
        body=body.get("body", ""),
        tags=normalized_tags,
        community_id=body["communityId"],
        goal_id=body.get("goalId"),
    )
    db.add(post)
    await db.flush()
    await db.refresh(post)
    return JSONResponse(content=post.to_dict(), status_code=201)


@router.get("/thoughts/posts/{id}")
async def get_post(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(ThoughtPost).where(
            ThoughtPost.id == id, ThoughtPost.user_id == user.id
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    data = post.to_dict()

    # Flat comments list
    comments_result = await db.execute(
        select(Comment)
        .where(Comment.post_id == id, Comment.user_id == user.id)
        .order_by(Comment.created_at)
    )
    comments = comments_result.scalars().all()
    data["comments"] = [c.to_dict() for c in comments]

    # User's vote on this post
    post_vote_result = await db.execute(
        select(Vote).where(
            Vote.user_id == user.id,
            Vote.target_type == "post",
            Vote.target_id == id,
        )
    )
    post_vote = post_vote_result.scalar_one_or_none()
    data["userVote"] = post_vote.value if post_vote else 0

    # User's votes on comments
    comment_ids = [c.id for c in comments]
    comment_votes = {}
    if comment_ids:
        votes_result = await db.execute(
            select(Vote).where(
                Vote.user_id == user.id,
                Vote.target_type == "comment",
                Vote.target_id.in_(comment_ids),
            )
        )
        for v in votes_result.scalars().all():
            comment_votes[v.target_id] = v.value
    data["commentVotes"] = comment_votes

    return data


@router.put("/thoughts/posts/{id}")
async def update_post(
    id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(ThoughtPost).where(
            ThoughtPost.id == id, ThoughtPost.user_id == user.id
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if "title" in body:
        post.title = body["title"]
    if "body" in body:
        post.body = body["body"]
    if "tags" in body:
        raw_tags = body["tags"]
        post.tags = ",".join(t.strip().lower() for t in raw_tags.split(",") if t.strip())
    if "communityId" in body:
        post.community_id = body["communityId"]
    if "goalId" in body:
        post.goal_id = body["goalId"]

    await db.flush()
    await db.refresh(post)
    return post.to_dict()


@router.delete("/thoughts/posts/{id}")
async def delete_post(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(ThoughtPost).where(
            ThoughtPost.id == id, ThoughtPost.user_id == user.id
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Delete associated votes
    await db.execute(
        delete(Vote).where(Vote.target_type == "post", Vote.target_id == id)
    )
    # Delete comment votes
    comment_ids = [c.id for c in post.comments]
    if comment_ids:
        await db.execute(
            delete(Vote).where(
                Vote.target_type == "comment",
                Vote.target_id.in_(comment_ids),
            )
        )

    await db.delete(post)
    await db.flush()
    return {"message": "Post deleted"}


# -- Comments --

@router.post("/thoughts/posts/{post_id}/comments")
async def create_comment(
    post_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(ThoughtPost).where(
            ThoughtPost.id == post_id, ThoughtPost.user_id == user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Post not found")

    comment = Comment(
        user_id=user.id,
        post_id=post_id,
        parent_id=body.get("parentId"),
        body=body["body"],
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment)
    return JSONResponse(content=comment.to_dict(), status_code=201)


@router.delete("/thoughts/comments/{id}")
async def delete_comment(
    id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(
        select(Comment).where(Comment.id == id, Comment.user_id == user.id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    await db.execute(
        delete(Vote).where(Vote.target_type == "comment", Vote.target_id == id)
    )
    await db.delete(comment)
    await db.flush()
    return {"message": "Comment deleted"}


# -- Voting --

@router.post("/thoughts/vote")
async def cast_vote(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    target_type = body["targetType"]
    target_id = body["targetId"]
    value = body["value"]

    result = await db.execute(
        select(Vote).where(
            Vote.user_id == user.id,
            Vote.target_type == target_type,
            Vote.target_id == target_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        if existing.value == value:
            await db.delete(existing)
        else:
            existing.value = value
    else:
        vote = Vote(
            user_id=user.id,
            target_type=target_type,
            target_id=target_id,
            value=value,
        )
        db.add(vote)

    await db.flush()

    # Return updated score
    score_result = await db.execute(
        select(func.coalesce(func.sum(Vote.value), 0)).where(
            Vote.target_type == target_type, Vote.target_id == target_id
        )
    )
    score = score_result.scalar()

    current_vote_result = await db.execute(
        select(Vote).where(
            Vote.user_id == user.id,
            Vote.target_type == target_type,
            Vote.target_id == target_id,
        )
    )
    current_vote = current_vote_result.scalar_one_or_none()

    return {
        "score": score,
        "userVote": current_vote.value if current_vote else 0,
    }
