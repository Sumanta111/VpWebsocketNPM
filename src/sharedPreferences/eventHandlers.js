/* eslint-disable */
export const events = {

    handleCreateCustomEvents: (eventName) => {
        var event = new CustomEvent(eventName);
        window.dispatchEvent(event);
    },
}
