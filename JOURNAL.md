Docker Hub disables /v2/_catalog endpoint, so we can't just directly get the full list of images
Docker Hub has its search UI, but gonna try to find a way to list images without having to do webscrape

Tried
https://index.docker.io/v2/_catalog
https://registry.hub.docker.com/v2/_catalog
hub.docker.com/v2/repositories

Found https://forums.docker.com/t/list-of-all-repositories-in-registry/27632/2
https://github.com/mayflower/docker-ls/blob/master/lib/api_repository_list.go but still just using _catalog

Docker Hub disables _catalog:
https://forums.docker.com/t/registry-v2-catalog/45368/2

Found https://stackoverflow.com/questions/50942186/get-list-of-all-available-nodex-images-on-docker-hub
hub.docker.com/v2/repositories/library gets all repositories for library
Tried hub.docker.com/v2/publishers to get all publishers

Found https://stackoverflow.com/questions/35444178/public-docker-v2-api-endpoints
https://hub.docker.com/v2/search/repositories/?query=*
YES!
https://hub.docker.com/v2/search/repositories/?query=*&page=100
https://hub.docker.com/v2/search/repositories/?query=*&page=1000
page may not exceed 100 :(

Can use page_size, but still limited to 100 items per page

Tried going to https://hub.docker.com/search and seeing what request gets sent
Found you can send https://hub.docker.com/api/content/v1/products/search?page=103&page_size=25&q=&type=image
Hmm, but it doesnt work when I curl it
Need to add header: "Search-Version: v3"