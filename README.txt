LeraWatch v0.6.4 SEARCH STATE FIX
Root cause fixed: v0.6.3 called renderSearchState(), but that function did not exist.
Added an isolated search renderer based only on lastSearchResults/lastQuery.
Profile/library HTML is cleared before every view render.
API and provider deep links untouched.
Cache bust: 064.
