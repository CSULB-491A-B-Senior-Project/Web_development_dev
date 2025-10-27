// njs script for handling Angular application routing
// This script ensures proper routing for the Angular SPA

function redirect(r) {
    // Get the request URI
    var uri = r.uri;
    
    // Define routes that should be handled by Angular
    var angularRoutes = [
        '/explore',
        '/home',
        '/main-page',
        '/settings-account',
        '/settings-profile',
        '/signup'
    ];
    
    // Check if the request is for an Angular route
    for (var i = 0; i < angularRoutes.length; i++) {
        if (uri.startsWith(angularRoutes[i])) {
            // Return index.html for Angular to handle routing
            r.internalRedirect('/src/app/app.html');
            return;
        }
    }
    
    // If it's an API call, redirect to backend
    if (uri.startsWith('/api/')) {
        r.internalRedirect('@app');
        return;
    }
    
    // Default: let nginx try_files handle it
    // This will serve static assets or fall back to index.html
    r.internalRedirect('/index.html');
}

// Alternative function for API-only redirects
function apiRedirect(r) {
    r.internalRedirect('@app');
}

// Function to always serve index.html (for catch-all routes)
function spaFallback(r) {
    r.internalRedirect('/index.html');
}

export default {redirect, apiRedirect, spaFallback}

