"""읽기 전용 조회 API. api.py 에서 app.include_router(make_router(relational)) 한 줄로 붙인다."""
from datetime import date

from fastapi import APIRouter, HTTPException, Query


def make_router(rel):
    router = APIRouter(prefix='/api')

    @router.get('/companies')
    def companies():
        return rel.companies()

    @router.get('/companies/{company_id}/org-chart')
    def org_chart(company_id: str, as_of: date | None = Query(None, alias='asOf')):
        tree = rel.org_tree(company_id, as_of.isoformat() if as_of else None)
        if tree is None:
            raise HTTPException(404, '회사를 찾을 수 없습니다.')
        return tree

    @router.get('/people/{person_id}/history')
    def history(person_id: str):
        cards = rel.person_history(person_id)
        if not cards:
            raise HTTPException(404, '인물을 찾을 수 없습니다.')
        return cards

    @router.get('/people/{person_id}/shared-affiliations')
    def shared(person_id: str):
        return rel.shared_affiliations(person_id)

    return router
