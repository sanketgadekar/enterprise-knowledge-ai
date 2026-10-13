context = await RetrievalService.retrieve_context(
    db=db,
    company_id=current_user["company_id"],
    query="What is Enterprise AI?",
)
