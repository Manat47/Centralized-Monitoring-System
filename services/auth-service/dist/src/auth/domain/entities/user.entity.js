"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
class User {
    props;
    constructor(props) {
        this.props = props;
    }
    static create(userId, input) {
        const now = new Date();
        return new User({
            userId,
            email: input.email.trim().toLowerCase(),
            passwordHash: input.passwordHash,
            displayName: input.displayName.trim(),
            role: input.role,
            status: 'ACTIVE',
            lastLoginAt: null,
            createdAt: now,
            updatedAt: now,
        });
    }
    static restore(props) {
        return new User(props);
    }
    activate(now = new Date()) {
        this.props.status = 'ACTIVE';
        this.props.updatedAt = now;
    }
    deactivate(now = new Date()) {
        this.props.status = 'INACTIVE';
        this.props.updatedAt = now;
    }
    changeRole(role, now = new Date()) {
        this.props.role = role;
        this.props.updatedAt = now;
    }
    changeDisplayName(displayName, now = new Date()) {
        this.props.displayName = displayName.trim();
        this.props.updatedAt = now;
    }
    changePasswordHash(passwordHash, now = new Date()) {
        this.props.passwordHash = passwordHash;
        this.props.updatedAt = now;
    }
    recordLogin(now = new Date()) {
        this.props.lastLoginAt = now;
        this.props.updatedAt = now;
    }
    toObject() {
        return { ...this.props };
    }
}
exports.User = User;
//# sourceMappingURL=user.entity.js.map