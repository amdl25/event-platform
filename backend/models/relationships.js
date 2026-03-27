import Account from './Account.js';
import Organization from './Organization.js';
import Event from './Event.js';
import Participation from './Participation.js';
import Category from './Category.js';
import LoyaltyWallet from './LoyaltyWallet.js';
import LoyaltyTransaction from './LoyaltyTransaction.js';

Account.hasMany(Organization, { foreignKey: 'owner_id', as: 'ownedOrganizations' });
Organization.belongsTo(Account, { foreignKey: 'owner_id', as: 'owner' });

Account.hasMany(Event, { foreignKey: 'creator_id', as: 'createdEvents' });
Event.belongsTo(Account, { foreignKey: 'creator_id', as: 'creator' });

Organization.hasMany(Event, { foreignKey: 'org_id', as: 'events' });
Event.belongsTo(Organization, { foreignKey: 'org_id', as: 'organization' });


Account.belongsToMany(Event, { 
    through: { model: Participation, unique: false }, 
    foreignKey: 'account_id', 
    otherKey: 'event_id',
    as: 'attendedEvents' 
});
Event.belongsToMany(Account, { 
    through: { model: Participation, unique: false }, 
    foreignKey: 'event_id', 
    otherKey: 'account_id',
    as: 'participants' 
});

Account.hasMany(Participation, { foreignKey: 'account_id' });
Participation.belongsTo(Account, { foreignKey: 'account_id' });
Event.hasMany(Participation, { foreignKey: 'event_id' });
Participation.belongsTo(Event, { foreignKey: 'event_id' });


Account.belongsToMany(Category, { 
    through: 'user_interest', 
    foreignKey: 'account_id', 
    otherKey: 'category_id',
    as: 'interests' 
});
Category.belongsToMany(Account, { 
    through: 'user_interest', 
    foreignKey: 'category_id', 
    otherKey: 'account_id' 
});

Event.belongsToMany(Category, { 
    through: 'event_category', 
    foreignKey: 'event_id', 
    otherKey: 'category_id',
    as: 'categories' 
});
Category.belongsToMany(Event, { 
    through: 'event_category', 
    foreignKey: 'category_id', 
    otherKey: 'event_id' 
});


Account.hasMany(LoyaltyWallet, { foreignKey: 'account_id', as: 'wallets' });
LoyaltyWallet.belongsTo(Account, { foreignKey: 'account_id' });

Organization.hasMany(LoyaltyWallet, { foreignKey: 'org_id', as: 'loyaltyProgram' });
LoyaltyWallet.belongsTo(Organization, { foreignKey: 'org_id' });

Account.hasMany(LoyaltyTransaction, { foreignKey: 'account_id' });
LoyaltyTransaction.belongsTo(Account, { foreignKey: 'account_id' });

Organization.hasMany(LoyaltyTransaction, { foreignKey: 'org_id' });
LoyaltyTransaction.belongsTo(Organization, { foreignKey: 'org_id' });

Event.hasMany(LoyaltyTransaction, { foreignKey: 'event_id' });
LoyaltyTransaction.belongsTo(Event, { foreignKey: 'event_id' });


export { 
  Account, 
  Organization, 
  Event, 
  Participation, 
  Category, 
  LoyaltyWallet, 
  LoyaltyTransaction 
};