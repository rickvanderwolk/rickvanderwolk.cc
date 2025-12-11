(function() {
    var cloud = document.getElementById("word-cloud");
    var projects = document.querySelectorAll("#projects > .row");

    if (!cloud) return;

    function getActiveTag() {
        var params = new URLSearchParams(window.location.search);
        return params.get("tag");
    }

    function filterProjects(tag) {
        var visibleIndex = 0;
        projects.forEach(function(project) {
            var projectTags = JSON.parse(project.dataset.tags || "[]");
            var shouldShow = !tag || projectTags.indexOf(tag) !== -1;
            project.style.display = shouldShow ? "" : "none";
            project.classList.remove("first-visible");

            if (shouldShow) {
                // Mark first visible
                if (visibleIndex === 0) {
                    project.classList.add("first-visible");
                }
                // Alternate row direction based on visible index
                if (visibleIndex % 2 === 0) {
                    project.classList.remove("row-reverse");
                } else {
                    project.classList.add("row-reverse");
                }
                visibleIndex++;
            }
        });
    }

    function updateCloudState(tag) {
        var items = cloud.querySelectorAll(".cloud-item");

        if (tag) {
            cloud.classList.add("has-active");
        } else {
            cloud.classList.remove("has-active");
        }

        items.forEach(function(item) {
            if (item.dataset.tag === tag) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });
    }

    function updateUrl(tag) {
        var url = tag ? "/?tag=" + encodeURIComponent(tag) : "/";
        history.pushState({ tag: tag }, "", url);
    }

    function handleTagClick(e) {
        var target = e.target.closest(".cloud-item");
        if (!target) return;

        e.preventDefault();

        var clickedTag = target.dataset.tag;
        var currentTag = getActiveTag();
        var newTag = clickedTag === currentTag ? null : clickedTag;

        updateUrl(newTag);
        updateCloudState(newTag);
        filterProjects(newTag);
    }

    // Handle browser back/forward
    window.addEventListener("popstate", function(e) {
        var tag = e.state ? e.state.tag : getActiveTag();
        updateCloudState(tag);
        filterProjects(tag);
    });

    // Click handler
    cloud.addEventListener("click", handleTagClick);

    // Set initial state from URL
    var initialTag = getActiveTag();
    if (initialTag) {
        history.replaceState({ tag: initialTag }, "", window.location.href);
    }
})();
