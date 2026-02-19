# Models Overview
For the reader and developers who intend to update or analyse the work.


This is based of a databse schema delivered by database engineers.


Each model in this folder represents a database table and uses Laravel’s Eloquent ORM.

`use HasFactory;`
- This line includes a *trait* from Laravel.
- Traits = reusable pieces of code you can “inject” into classes.


- `HasFactory` allows models to use factories. This is useful for generating fake data during testing or seeding.

- `$fillable`
- Declares which attributes can be *mass assigned* (multiple attributes to a model)
- Protects against mass assignment vulnerabilities.


User.php is based on Laravel's default user model and has been modified to fully reflect the Database schema.

This work is based on a database schema as well as an SQL file.

-- since writing this the work has been modified as the database auto-increments

If the uid in the database auto-increments (automatically assigns values), then extra lines of code are needed to tell Laravel not to auto-generate it .These lines are currently commented out, as they may not be necessary if the database automatically assigns values to a new user.
I may switch between commenting the uid settings in/out.

--

ProductImage is not defined in the sql or database but has been created to handle a possible future where multiple images may require handling.
This relation should be added in Product.php if that is the case.





Each model has been completed with relationships reflecting the database schema.
User.php handles authentication and basic user info and now includes relationships to staff_profiles, addresses, baskets, orders, and reviews.