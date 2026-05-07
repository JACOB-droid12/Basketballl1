export function requireSignedIn(request, response, next) {
  if (!request.session?.user) {
    response.redirect("/login");
    return;
  }

  next();
}
